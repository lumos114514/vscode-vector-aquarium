import { Vector2D } from "./core/Vector2D";
import { Food } from "./Food";
import { IController } from "./IController";
import { Random } from "./core/Random";
import { IColony } from "./IColoney";
import { Numerics } from "./core/Numerics";
import { IRenderer } from "./IRenderer";
import { Color } from "./core/Color";
import { Scene } from "./core/Scene";
import { Actor } from "./core/Actor";
import { MousePressedEvent } from "./core/MouseEvent";
import { FoodProvider } from "./FoodProvider";

export class TargetTrackingControllerOption {
    public speedBias = 1;
}

/// <summary>
///
/// </summary>
export class TargetTrackingController<T extends IColony> extends Actor implements IController<T> {
    colony: T;
    public speed = 1.0;
    speedBias = 2;
    protected angle = 0;
    targetLocation: Vector2D | null = null;
    food: Food | null = null;
    smoothCurveRate: number;
    autoTarget = true;
    endForceTrack: null | (() => void) = null;
    shockAvoidDistance = 80;
    shockThreshouldDistance = 80;
    foodTriggerDistance = 120;
    isShowEnabled = true;
    isFoodEnabled = true;
    foodViewableAngleDeg = 160;
    foodProvider: FoodProvider | null = null;
    smoothCurveTriggerDistance = Infinity;
    debug = false;

    get isForceTracking() {
        return !!this.endForceTrack;
    }

    noizeSize = 1;

    public constructor(
        colony: T,
        speed = 125,
        smoothCurveRate = 0.01
    ) {
        super();

        this.colony = colony;
        this.speedBias = speed;
        this.smoothCurveRate = smoothCurveRate;
        // colony.IsFlicking = false;
    }

    setup(scene: Scene): void {
        const p = scene.actors.find(x => x instanceof FoodProvider);
        if (p) {
            this.foodProvider = p as FoodProvider;
        }
    }

    pressed(e: MousePressedEvent): void {
        this.shock(e.position);
    }

    update(deltaTime: number, scene: Scene) {
        this.endForceTrack?.();
        const location = this.colony.location;

        // 捕食できる餌がないかチェックしあればトラッキング
        this.checkFoodAction();

        // 目的地が設定されていなければ目的地を初期化
        if (!this.targetLocation && this.autoTarget) {
            this.initTargetLocation(
                new Vector2D(
                    Random.next(scene.width),
                    Random.next(scene.height)));
            return;
        }

        if (!this.targetLocation) {
            return;
        }

        if (this.debug) {
            scene.renderer.drawCircle(this.targetLocation!.x, this.targetLocation!.y, 20, new Color(255, 255, 0));
        }

        let x = this.targetLocation.x - location.x;
        let y = this.targetLocation.y - location.y;

        const noisev = () => Math.random() * 0.5 * this.speed * this.noizeSize;

        const angleDiff = Math.atan2(y, x);
        this.angle = Numerics.lerpAngle(this.angle, angleDiff, this.smoothCurveRate);

        // 線形補間した角度をベクトル変換し足すことで、滑らかに大まわりに回転させる
        if (Numerics.dist(this.targetLocation, location) > this.smoothCurveTriggerDistance) {
            x = Math.cos(this.angle);
            y = Math.sin(this.angle);
        }

        // 正規化してスピードとデルタタイムを合わせる
        const vector = Numerics.normalize(new Vector2D(x, y));
        const vx = vector.x * this.speed + noisev();
        const vy = vector.y * this.speed + noisev();

        this.colony.translate(new Vector2D(vx * deltaTime, vy * deltaTime));
        this.colony.rotate(this.angle);
        this.colony.update(deltaTime, scene);

        // 次回のフレームで初期化させるため
        if (Numerics.dist(this.colony.location, this.targetLocation) <= 20.0) {
            if (this.autoTarget && !this.isForceTracking) {
                this.targetLocation = null;
            }
        }
    }

    private initTargetLocation(location: Vector2D) {
        this.targetLocation = location;
        this.speed = this.speedBias * (1.0 + Random.nextDouble() * 0.5);
    }

    translateTargetLocation(location: Vector2D, speed?: number) {
        if (this.isForceTracking || this.food) {
            return;
        }

        if (speed) {
            this.speed = speed;
        }

        if (!this.targetLocation) {
            this.targetLocation = ({
                x: location.x,
                y: location.y
            });
        }
        else {
            this.targetLocation = ({
                x: this.targetLocation.x + location.x,
                y: this.targetLocation.y + location.y
            });
        }
    }

    shock(inputlocation: Vector2D) {
        const location = this.colony.location;

        if (Numerics.dist(inputlocation, location) <= this.shockThreshouldDistance) {
            this.endForceTrack && this.endForceTrack();

            // 入力の座標とプリミティブの座標のベクトルの逆の地点を目的地へ設定
            // 速度も上げる
            const vec = Numerics.normalize(new Vector2D(
                inputlocation.x - location.x,
                inputlocation.y - location.y));
            const x = location.x - vec.x * this.shockAvoidDistance;
            const y = location.y - vec.y * this.shockAvoidDistance;

            const lastSpeed = this.speed;
            const target = this.targetLocation;

            this.targetLocation = new Vector2D(x, y);
            this.speed = this.speedBias * 5;
            this.endForceTrack = () => {
                if (!this.targetLocation) {
                    return;
                }

                if (Numerics.dist(this.colony.location, this.targetLocation) <= 20.0) {
                    this.speed = lastSpeed;
                    this.targetLocation = target;
                    this.endForceTrack = null;
                }
            };
        }
    }

    private checkFoodAction() {
        const getEatableFood = () => {
            if (!this.foodProvider) {
                return;
            }

            const foods = this.foodProvider.foods;
            if (foods.length > 0) {
                // 一番近い餌を格納
                let food = foods[0].colony;
                for (let i = 1; i < foods.length; i++) {
                    if (
                        Numerics.dist(
                            this.colony.location,
                            foods[i].colony.location)
                        <
                        Numerics.dist(
                            this.colony.location,
                            food.location)
                    ) {
                        food = foods[i].colony;
                    }
                }

                if (Numerics.dist(this.colony.location, food.location) <= this.foodTriggerDistance) {
                    const angleDiff = Math.atan2(food.location.y - this.colony.location.y, food.location.x - this.colony.location.x);
                    const a = Math.atan2(this.colony.vector.y, this.colony.vector.x);
                    if (Math.abs(a - angleDiff) < Numerics.toRadians(this.foodViewableAngleDeg * 0.5)) {
                        return food;
                    }
                }
            }

            return null;
        };

        const f = getEatableFood();
        if (f) {
            if (this.food || this.endForceTrack) {
                return;
            }

            const target = this.targetLocation;
            const lastSpeed = this.speed;

            this.targetLocation = f.location;
            this.speed = this.speedBias * 1.8;
            this.food = f;

            this.endForceTrack = () => {
                if (!this.foodProvider) {
                    return;
                }

                if (!this.food || Numerics.dist(this.colony.location, this.food.location) <= 10.0) {

                    if (this.food) {
                        this.foodProvider.remove(this.food);
                    }
                    this.food = null;
                    this.targetLocation = target;
                    this.speed = lastSpeed;
                    this.endForceTrack = null;
                }
            };
        }
        else {
            this.food = null;
        }
    }
}
